import { Card } from "./card.model";

export interface List {
  id: number;
  boardId: number;
  title: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  cards: Card[]
  // Add UI state properties
  showActions?: boolean;
}

export interface ListDto {
  title: string;
  position?: number;
}
