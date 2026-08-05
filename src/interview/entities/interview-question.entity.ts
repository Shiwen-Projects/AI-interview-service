import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { InterviewAnswer } from '../types';

@Entity('questions')
export class InterviewQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string;

  @Column({ type: 'text' })
  question!: string;

  @Column({ type: 'jsonb' })
  answer!: InterviewAnswer;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}