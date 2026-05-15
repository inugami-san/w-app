export type CompanionMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

export type CompanionChatSummary = {
  id: string;
  dateKey: string;
  title: string;
  body: string;
  createdAt: string;
  messages: CompanionMessage[];
};

export type CompanionDayEntry = {
  dateKey: string;
  messages: CompanionMessage[];
  summaries: CompanionChatSummary[];
  updatedAt: string;
};
