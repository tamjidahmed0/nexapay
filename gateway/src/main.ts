import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import { RedisStore } from "connect-redis";
import { RedisService } from './redis/redis.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );



  const redisService = app.get(RedisService);
  const redisClient = redisService.getClient();
  const store = new RedisStore({
    client: redisClient,
    prefix: 'session:nexapay:',
    disableTouch: true
  });
 

  app.use(
    session({
      store,
      secret: process.env.SESSION_SECRET || 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 5
      },
    }),
  );





  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
