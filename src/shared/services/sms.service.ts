import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import qs from 'qs';

@Injectable()
export class SmsService {
  private readonly apiKey?: string;
  private readonly senderId?: string;
  private readonly endpoint = 'https://api.mnotify.com/api/sms/quick';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SMS_MNOTIFY_API_KEY');
    this.senderId = this.configService.get<string>('SMS_SENDER_ID');

    if (!this.apiKey || !this.senderId) {
      throw new Error(
        'Missing MNOTIFY_API_KEY or MNOTIFY_SENDER_ID in environment variables',
      );
    }
  }

  async sendSms(phone: string, message: string): Promise<any> {
    const url = `${this.endpoint}?key=${this.apiKey}`;

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        // e.g. "0549677744" -> "+233549677744"
        formattedPhone = '+233' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('233')) {
        // e.g. "233549677744" -> "+233549677744"
        formattedPhone = '+' + formattedPhone;
      } else {
        // e.g. "549677744" -> "+233549677744"
        formattedPhone = '+233' + formattedPhone;
      }
    }

    const formData = qs.stringify({
      'recipient[]': formattedPhone,
      sender: this.senderId,
      message,
      is_schedule: false,
      schedule_date: '',
    });

    try {
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      console.log('SMS Sent:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('SMS Error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to send SMS');
    }
  }
}
