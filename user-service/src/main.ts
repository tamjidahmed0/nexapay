import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      port: process.env.PORT as unknown as number ?? 3001
    }
  });

  await app.listen();
  console.log(`user microservice is running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
