import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import { answerWithGemini } from './gemini';
import { type MemoryHit, searchHomeMemory } from './xtrace';

const HomeMemoryState = Annotation.Root({
  question: Annotation<string>(),
  useMemory: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => true
  }),
  memories: Annotation<MemoryHit[]>({
    reducer: (_current, update) => update,
    default: () => []
  }),
  answer: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ''
  })
});

const retrieveGraph = new StateGraph(HomeMemoryState)
  .addNode('retrieve_from_xtrace', async (state) => {
    if (!state.useMemory) {
      return { memories: [] };
    }
    const memories = await searchHomeMemory(state.question);
    return { memories };
  })
  .addNode('answer_from_memory_only', async (state) => {
    const answer = await answerWithGemini(state.question, state.memories);
    return { answer };
  })
  .addEdge(START, 'retrieve_from_xtrace')
  .addEdge('retrieve_from_xtrace', 'answer_from_memory_only')
  .addEdge('answer_from_memory_only', END)
  .compile();

export async function askHomeMemory(question: string, options?: { useMemory?: boolean }) {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error('Question is required');
  }

  const result = await retrieveGraph.invoke({
    question: trimmed,
    useMemory: options?.useMemory ?? true
  });
  return {
    answer: result.answer,
    memories: result.memories,
    usedMemory: options?.useMemory ?? true
  };
}
