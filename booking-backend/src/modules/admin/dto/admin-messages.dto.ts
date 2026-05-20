import { ApiProperty } from '@nestjs/swagger';

export class MessageItemDto {
  @ApiProperty({ description: '消息ID' })
  id!: string;

  @ApiProperty({ description: '发送者名称' })
  sender!: string;

  @ApiProperty({ description: '消息主题' })
  subject!: string;

  @ApiProperty({ description: '消息正文' })
  body!: string;

  @ApiProperty({ description: '是否已读' })
  read!: boolean;

  @ApiProperty({ description: '发送时间 (ISO 8601)' })
  createdAt!: string;
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageItemDto] })
  items!: MessageItemDto[];

  @ApiProperty({ description: '总记录数' })
  total!: number;

  @ApiProperty({ description: '当前页码' })
  page!: number;

  @ApiProperty({ description: '每页条数' })
  limit!: number;
}

export class MessageUnreadCountDto {
  @ApiProperty({ description: '未读消息数量' })
  count!: number;
}
