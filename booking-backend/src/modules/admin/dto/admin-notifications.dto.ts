import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NotificationItemDto {
  @ApiProperty({ description: "Notification ID" })
  id!: string;

  @ApiProperty({ description: "Display type", enum: ["info", "warning", "error", "success"] })
  type!: string;

  @ApiProperty({ description: "Notification title" })
  title!: string;

  @ApiProperty({ description: "Notification body text" })
  body!: string;

  @ApiProperty({ description: "Whether the notification has been read" })
  read!: boolean;

  @ApiProperty({ description: "Creation timestamp (ISO 8601)" })
  created_at!: string;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationItemDto] })
  items!: NotificationItemDto[];

  @ApiProperty({ description: "Total number of notifications" })
  total!: number;

  @ApiProperty({ description: "Current page number" })
  page!: number;

  @ApiProperty({ description: "Items per page" })
  limit!: number;
}

export class UnreadCountDto {
  @ApiProperty({ description: "Number of unread notifications" })
  count!: number;
}
