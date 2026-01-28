"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

interface MessageThreadProps {
  jobId: string;
  currentUserId: string;
  recipientId: string;
  initialMessages: Message[];
}

export function MessageThread({
  jobId,
  currentUserId,
  recipientId,
  initialMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if we're the recipient
          if (newMsg.recipient_id === currentUserId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentUserId, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          job_id: jobId,
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: messageText,
        })
        .select()
        .single();

      if (error) throw error;

      // Add message to local state (realtime subscription will also add it)
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } catch (error) {
      console.error("Send message error:", error);
      // Restore message if failed
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-center mb-4">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {group.label}
              </span>
            </div>

            <div className="space-y-2">
              {group.messages.map((message) => {
                const isOwnMessage = message.sender_id === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isOwnMessage ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="break-words">{message.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isOwnMessage
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(message.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Start the conversation by sending a message
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 pt-4 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={!newMessage.trim() || sending}>
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </>
  );
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; label: string; messages: Message[] }[] = [];

  messages.forEach((message) => {
    const messageDate = new Date(message.created_at);
    const dateKey = format(messageDate, "yyyy-MM-dd");

    let label: string;
    if (isToday(messageDate)) {
      label = "Today";
    } else if (isYesterday(messageDate)) {
      label = "Yesterday";
    } else {
      label = format(messageDate, "MMMM d, yyyy");
    }

    const existingGroup = groups.find((g) => g.date === dateKey);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date: dateKey, label, messages: [message] });
    }
  });

  return groups;
}
