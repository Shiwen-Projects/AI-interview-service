import {
  Column,
  CreateDateColumn,
  Entity,
  // OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
// import { InterviewQuestion } from './interview-question.entity';

export type InterviewSessionStatus = 'generating' | 'ready' | 'error';

@Entity('sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  post: string;

  @Column({ type: 'text' })
  jobDescription: string;

  @Column({ type: 'uuid' })
  cvId: string;

  // TODO: Implement this
  // @Column({ default: 'generating' })
  // status: InterviewSessionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
