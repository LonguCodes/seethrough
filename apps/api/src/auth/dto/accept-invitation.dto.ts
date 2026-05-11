import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Password chosen by the invited user' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
