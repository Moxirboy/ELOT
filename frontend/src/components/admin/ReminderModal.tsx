import { useEffect, useState } from "react";
import { Copy, Mail, MessageCircle, Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Props {
  open: boolean;
  onClose: () => void;
  initialMessage?: string;
  initialSubject?: string;
  /** Optional pre-filled recipient list (emails / names). */
  recipients?: string[];
}

/**
 * Composer for the reminder Copilot suggests. The hackathon demo ships
 * Email + Slack + Copy — Slack opens slack:// (deep link), email opens
 * mailto: pre-filled, Copy puts the full message on the clipboard.
 */
export function ReminderModal({
  open,
  onClose,
  initialMessage = "",
  initialSubject = "ELOT AI — training reminder",
  recipients = [],
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [to, setTo] = useState(recipients.join(", "));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setMessage(initialMessage);
      setTo(recipients.join(", "));
      setCopied(false);
    }
  }, [open, initialMessage, initialSubject, recipients]);

  function copy() {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openEmail() {
    const params = new URLSearchParams({
      subject,
      body: message,
    });
    const recipient = encodeURIComponent(to);
    window.location.href = `mailto:${recipient}?${params.toString()}`;
  }

  function openSlack() {
    // No team workspace context — fall back to copying for the demo.
    navigator.clipboard.writeText(message).then(() => {
      alert("Message copied — paste it into Slack.");
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send reminder"
      description="Compose a reminder for overdue or high-risk employees."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={openEmail} disabled={!message.trim()}>
            <Send className="h-4 w-4" /> Send via email
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Recipients">
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="comma-separated emails"
          />
        </Field>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copy} disabled={!message.trim()}>
            <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy message"}
          </Button>
          <Button variant="outline" onClick={openSlack} disabled={!message.trim()}>
            <MessageCircle className="h-4 w-4" /> Send via Slack
          </Button>
          <Button variant="outline" onClick={openEmail} disabled={!message.trim()}>
            <Mail className="h-4 w-4" /> Open in mail client
          </Button>
        </div>
        <Badge tone="warning" className="block w-fit">
          Demo channels — email uses mailto:, Slack copies to clipboard.
        </Badge>
      </div>
    </Modal>
  );
}
