export interface Card {
  id: number;
  listId: number;
  title: string;
  description: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDto {
  title: string;
  description: string;
  listId?: number;
  position?: number;
}
