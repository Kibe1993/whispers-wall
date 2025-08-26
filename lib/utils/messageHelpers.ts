// /lib/utils/messageHelpers.ts
import { Message, Reply } from "@/lib/interface/typescriptinterface";

// 🔄 Utility to deeply update replies (recursive)
export function updateRepliesRecursively(
  replies: Reply[],
  updated: Message
): Reply[] {
  return replies.map((r) =>
    r._id === updated._id
      ? { ...r, ...updated }
      : { ...r, replies: updateRepliesRecursively(r.replies || [], updated) }
  );
}

// 🔄 Replace or merge an updated message into the tree
export function mergeUpdatedMessage(messages: Message[], updated: Message) {
  return messages.map((m) => {
    if (m._id === updated._id) {
      return { ...m, ...updated }; // root message updated
    }
    return {
      ...m,
      replies: updateRepliesRecursively(m.replies || [], updated),
    };
  });
}

// 🔄 Recursively remove a reply by ID
export function removeReplyRecursively(replies: Reply[], id: string): Reply[] {
  return replies
    .filter((r) => r._id !== id)
    .map((r) => ({
      ...r,
      replies: removeReplyRecursively(r.replies || [], id),
    }));
}
