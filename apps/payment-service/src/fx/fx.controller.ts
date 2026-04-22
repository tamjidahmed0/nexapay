import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FxService } from './fx.service';

@Controller('fx')
export class FxController {

    constructor(
        private readonly fxService: FxService
    ) { }

    @MessagePattern('create-quote')
    async createQuote(@Payload() dto) {
        return this.fxService.createQuote(dto)
    }


}
