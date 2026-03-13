import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PackagesService } from './packages.service';

@Controller('packages')
export class PackagesController {
    constructor(private readonly packagesService: PackagesService) { }

    @Get()
    async getPackages() {
        try {
            return await this.packagesService.getPackages();
        } catch (err: any) {
            throw new HttpException(err.message || 'Failed to fetch packages', HttpStatus.BAD_GATEWAY);
        }
    }

}
