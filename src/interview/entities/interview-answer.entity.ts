// import {
//   Column,
//   Entity,
//   JoinColumn,
//   OneToOne,
//   PrimaryGeneratedColumn,
// } from 'typeorm';
// import { InterviewQuestion } from './interview-question.entity';

// @Entity('interview_answers')
// export class InterviewAnswer {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   questionId: string;

//   @OneToOne(() => InterviewQuestion, (question) => question.answer, {
//     onDelete: 'CASCADE',
//   })
//   @JoinColumn({ name: 'questionId' })
//   question: InterviewQuestion;

//   @Column({ type: 'text' })
//   answer: string;

//   @Column({ default: 0 })
//   overallScore: number;

//   @Column({ type: 'jsonb', default: {} })
//   scoreBreakdown: Record<string, number>;

//   @Column({ type: 'text', default: '' })
//   suggestion: string;
// }
