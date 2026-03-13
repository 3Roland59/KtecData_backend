import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export interface NagonuPackage {
    service_name: string;
    network: string;
    offer_id: number;
    package: string;
    amount: number;
}

export interface CustomPackage {
    service_name: string;
    network: string;
    package: string;
    offer_id: number;
    original_price?: number;
    custom_price: number;
}

export interface DisplayPackage {
    service_name: string;
    network: string;
    offer_id: number;
    package: string;
    // nagonu_price: number;
    custom_price: number;
    type: 'regular' | 'bigtime';
}

@Injectable()
export class PackagesService {
    private readonly logger = new Logger(PackagesService.name);
    private readonly apiKey: string | undefined;
    private readonly baseUrl = 'https://www.nagonu.com';
    private readonly customPricesPath = path.join(process.cwd(), 'config', 'custom-prices.json');

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('NAGONU_API_KEY');
        if (!this.apiKey) {
            this.logger.warn('NAGONU_API_KEY is not defined; package fetching will fail');
        }
    }

    /** Save custom prices back to disk */
    saveCustomPrices(prices: CustomPackage[]): void {
        const dir = path.dirname(this.customPricesPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.customPricesPath, JSON.stringify(prices, null, 2), 'utf-8');
        this.logger.log('Custom prices saved.');
    }

    /** Fetch packages from Nagonu and merge with custom prices */
    async getPackages(): Promise<{ regular: DisplayPackage[]; bigtime: DisplayPackage[] }> {
        if (!this.apiKey) {
            throw new Error('NAGONU_API_KEY is not configured');
        }

        const response = await axios.get(`${this.baseUrl}/api/packages.php`, {
            headers: { 'x-api-key': this.apiKey },
        });

        const data = response.data?.data?.data;
        if (!data) throw new Error('Unexpected response format from Nagonu');

        // Read the full array from file to sync it
        let customPricesArray: CustomPackage[] = [];
        try {
            if (fs.existsSync(this.customPricesPath)) {
                customPricesArray = JSON.parse(fs.readFileSync(this.customPricesPath, 'utf-8'));
            }
        } catch (e: any) {
            this.logger.error(`Error reading custom prices for sync: ${e.message}`);
        }

        const rawRegular: NagonuPackage[] = data.regular_packages || [];
        const rawBigtime: NagonuPackage[] = data.bigtime_packages || [];
        const allFetchedPackages = [...rawRegular, ...rawBigtime];

        let hasUpdates = false;

        for (const fetched of allFetchedPackages) {
            // Find existing by service_name and package size
            const existing = customPricesArray.find(
                cp => cp.service_name === fetched.service_name && cp.package === fetched.package
            );

            if (existing) {
                if (existing.original_price !== fetched.amount || existing.offer_id !== fetched.offer_id) {
                    existing.original_price = fetched.amount;
                    existing.offer_id = fetched.offer_id;
                    hasUpdates = true;
                }
            } else {
                // If it doesn't exist, append it to custom prices list
                customPricesArray.push({
                    service_name: fetched.service_name,
                    network: fetched.network,
                    package: fetched.package,
                    offer_id: fetched.offer_id,
                    original_price: fetched.amount,
                    custom_price: fetched.amount, // Default to original price initially
                });
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            this.saveCustomPrices(customPricesArray);
        }

        // Build a fast lookup map using service_name + package to be resilient against offer_id changes
        const customPricesMap: Record<string, number> = {};
        for (const entry of customPricesArray) {
            customPricesMap[`${entry.service_name}-${entry.package}`] = entry.custom_price;
        }

        const mapPackage = (pkg: NagonuPackage, type: 'regular' | 'bigtime'): DisplayPackage => {
            let network = pkg.network;
            // Normalize AirtelTigo networks so frontend NETWORK_MAP can pick it up as "AT"
            if (network === 'AT - iSHare' || network === 'AT - BigTime') {
                network = 'AT';
            }
            return {
                service_name: pkg.service_name,
                network,
                offer_id: pkg.offer_id,
                package: pkg.package,
                // nagonu_price: pkg.amount,
                custom_price: customPricesMap[`${pkg.service_name}-${pkg.package}`] ?? pkg.amount,
                type,
            };
        };

        // 1. Process bigtime_packages exactly as received
        const bigtime = rawBigtime.map(pkg => mapPackage(pkg, 'bigtime'));

        // 2. Process regular_packages (Only AT - iSHare & AT - BigTime)
        const filteredRegular = rawRegular.filter(
            pkg => pkg.network === 'AT - iSHare' || pkg.network === 'AT - BigTime'
        );

        // 3. Deduplicate AT packages by package string (e.g. "20GB"), favoring AT - BigTime
        const atMap = new Map<string, DisplayPackage>();
        for (const pkg of filteredRegular) {
            const mapped = mapPackage(pkg, 'regular');
            const size = mapped.package;
            const existing = atMap.get(size);

            if (!existing) {
                atMap.set(size, mapped);
            } else {
                // If an existing package is not BigTime and the new one IS BigTime, overwrite it
                if (existing.service_name !== 'AT - BigTime' && mapped.service_name === 'AT - BigTime') {
                    atMap.set(size, mapped);
                }
            }
        }

        const regular = Array.from(atMap.values());

        return {
            regular,
            bigtime,
        };
    }
}
