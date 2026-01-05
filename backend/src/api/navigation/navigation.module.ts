import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavigationMenuEntity } from './entities/navigation-menu.entity';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  imports: [TypeOrmModule.forFeature([NavigationMenuEntity])],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}

