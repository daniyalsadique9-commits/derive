"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { FileText } from "lucide-react";
import { QuestionText } from "@/components/markdown/QuestionText";
import type { UserMessage } from "@/lib/client/conversation";
import { toDataUrl } from "@/lib/client/image";
import { INTENT_DETAILS } from "./intents";

export function QuestionView({ message }: { message: UserMessage }) {
  const { user } = useUser();
  const intent = message.intent === "ask" ? null : INTENT_DETAILS[message.intent];
  const IntentIcon = intent?.icon;
  const attachments = message.images ?? [];

  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[85%] min-w-0 space-y-2 rounded-2xl bg-subtle px-4 py-3 text-[0.95rem] leading-relaxed text-ink">
        {intent && IntentIcon && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
            <IntentIcon className="size-3.5" />
            {intent.request}
          </p>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) =>
              file.mimeType === "application/pdf" ? (
                <span
                  key={index}
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                >
                  <FileText className="size-4 shrink-0 text-accent" />
                  <span className="truncate">{file.name ?? "Document.pdf"}</span>
                </span>
              ) : (
                <Image
                  key={index}
                  src={toDataUrl(file)}
                  alt={`Attached photo ${index + 1}`}
                  width={240}
                  height={240}
                  unoptimized
                  className="max-h-60 w-auto rounded-lg border border-line object-contain"
                />
              ),
            )}
          </div>
        )}
        {message.content ? (
          <QuestionText text={message.content} />
        ) : (
          !intent && attachments.length === 0 && <p className="text-ink-muted italic">Attachment</p>
        )}
      </div>
      {user?.imageUrl && (
        <Image
          src={user.imageUrl}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="mt-0.5 hidden size-7 shrink-0 rounded-full object-cover sm:block"
        />
      )}
    </div>
  );
}
