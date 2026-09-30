import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ScreensModule } from './screens/screens.module';
import { MediaModule } from './media/media.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { SyncModule } from './sync/sync.module';
import { ActivationModule } from './activation/activation.module';
import { EventsGateway } from './websocket/events.gateway';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    AuthModule,
    ScreensModule,
    MediaModule,
    PlaylistsModule,
    SyncModule,
    ActivationModule
  ],
  providers: [PrismaService, EventsGateway],
  exports: [PrismaService, EventsGateway]
})
export class AppModule {}
