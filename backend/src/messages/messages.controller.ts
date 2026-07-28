import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { QueenaiService } from '../queenai/queenai.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly queenaiService: QueenaiService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(@Query('channelId') channelId: string) {
    return this.messagesService.findAllByChannel(channelId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateMessageDto, @CurrentUser() user: any) {
    const message = await this.messagesService.create(dto);

    // Check if message mentions @gemini
    if (dto.text && dto.text.toLowerCase().includes('@gemini')) {
      try {
        // Get or create AI user
        let aiUser = await this.usersService.findAiUser();
        if (!aiUser) {
          aiUser = await this.usersService.createAiUser();
        }

        // Fetch context for AI processing
        const context = await this.queenaiService.fetchContext(dto.channelId, user.id);

        // Process message with Queen AI
        const aiResponse = await this.queenaiService.processMessage(
          dto.text,
          context,
          user.id,
        );

        // AI returned a text response - use AI user as author
        await this.messagesService.create({
          authorId: aiUser.id,
          channelId: dto.channelId,
          text: aiResponse.content,
          parentId: message.id,
        });
      } catch (error) {
        console.error('Queen AI processing error:', error);
        // Don't fail the message creation if AI fails
      }
    }

    return message;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.messagesService.remove(id);
  }
}
