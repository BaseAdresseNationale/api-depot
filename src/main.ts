import { NestFactory } from '@nestjs/core';
import * as session from 'express-session';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const config = new DocumentBuilder()
    .setTitle('API depot')
    .setDescription(
      'API permettant le versionning des fichier BALs des commune',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: `Please enter the authentication admin token`,
        name: 'Authorization',
        type: 'http',
        in: 'Header',
      },
      'admin-token',
    )
    .addBearerAuth(
      {
        description: `Please enter the authentication client token`,
        name: 'Authorization',
        type: 'http',
        in: 'Header',
      },
      'client-token',
    )
    .build();
  app.useGlobalPipes(new ValidationPipe());
  app.use(
    session({
      secret: 'SECRET',
      resave: false,
      saveUninitialized: false,
    }),
  );
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 4242);
}
bootstrap();
