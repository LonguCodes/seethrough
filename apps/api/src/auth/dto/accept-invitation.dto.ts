import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Password chosen by the invited user' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
