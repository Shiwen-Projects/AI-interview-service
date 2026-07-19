import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InterviewSessionStatus } from '../constants';

@Entity('sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  post!: string;

  @Column({ type: 'text' })
  jobDescription!: string;

  @Column({ type: 'uuid' })
  cvId!: string;

  @Column({ default: InterviewSessionStatus.Generating })
  status!: InterviewSessionStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
