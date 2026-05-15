import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, Sparkles, Copy, CheckCircle2, RefreshCw, Bot, User as UserIcon, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const AGENT_NAME = 'report_assistant';

// Pull builder-prompt fenced blocks out of assistant messages so we can render
// a "Copy Builder Prompt" button next to them.
function extractBuilderPrompts(text) {
  if (!text) return [];
  const re = /```builder-prompt\s*\n([\s\S]*?)```/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return out;
}

function ToolCallBadge({ toolCall }) {
  const name = (toolCall?.name || 'tool').split('.').pop();
  const status = toolCall?.status;
  const isRunning = status === 'running' || status === 'pending' || status === 'in_progress';
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      {isRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
      <span className="font-medium">{name}</span>
    </div>
  );
}

function MessageBubble({ message, onCopyPrompt }) {
  const isUser = message.role === 'user';
  const prompts = !isUser ? extractBuilderPrompts(message.content) : [];

  // Display body with the builder-prompt fences stripped (we render dedicated
  // copy cards for them below).
  const displayContent = !isUser && prompts.length > 0
    ? message.content.replace(/```builder-prompt[\s\S]*?```/g, '').trim()
    : message.content;

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-2', isUser && 'flex flex-col items-end')}>
        {displayContent && (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm',
              isUser ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-800'
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed">{displayContent}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5"
                components={{
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{children}</code>
                    ) : (
                      <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-x-auto text-xs">
                        <code>{children}</code>
                      </pre>
                    ),
                }}
              >
                {displayContent}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* File attachments shown on user messages */}
        {isUser && message.file_urls?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {message.file_urls.map((url, i) => (
              /\.(png|jpg|jpeg|gif|webp)$/i.test(url) ? (
                <img key={i} src={url} alt="attachment" className="max-w-[160px] rounded-lg border border-slate-200" />
              ) : (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                  Attachment {i + 1}
                </a>
              )
            ))}
          </div>
        )}

        {/* Builder prompt cards */}
        {prompts.map((p, i) => (
          <div key={i} className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3 w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                <Sparkles className="w-3.5 h-3.5" />
                Builder-Ready Prompt
              </div>
              <Button size="sm" variant="default" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => onCopyPrompt(p)}>
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
            <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono bg-white/70 rounded-lg p-2 border border-indigo-100 max-h-72 overflow-y-auto">
              {p}
            </pre>
          </div>
        ))}

        {/* Tool calls (e.g. saving the report) */}
        {!isUser && message.tool_calls?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.tool_calls.map((tc, i) => <ToolCallBadge key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <UserIcon className="w-4 h-4 text-slate-600" />
        </div>
      )}
    </div>
  );
}

export default function ReportAssistantChat({ onReportSaved }) {
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const lastReportCountRef = useRef(0);

  const startConversation = async () => {
    setStarting(true);
    try {
      const convo = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          name: `Report Session — ${new Date().toLocaleString()}`,
          description: 'User-initiated bug/feature reporting session',
        },
      });
      setConversation(convo);
      setMessages(convo.messages || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not start the assistant.', variant: 'destructive' });
    }
    setStarting(false);
  };

  // Subscribe to streaming updates once we have a conversation
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      if (data?.messages) setMessages(data.messages);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  // Detect when the agent creates a Report (tool call) and notify parent so
  // the list refreshes on the right side.
  useEffect(() => {
    const calls = messages.flatMap(m => m.tool_calls || []);
    const completedSaves = calls.filter(
      tc => (tc.name || '').toLowerCase().includes('report') &&
            (tc.name || '').toLowerCase().includes('create') &&
            (tc.status === 'completed' || tc.status === 'success')
    );
    if (completedSaves.length > lastReportCountRef.current) {
      lastReportCountRef.current = completedSaves.length;
      onReportSaved?.();
    }
  }, [messages, onReportSaved]);

  // Autoscroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        uploaded.push(file_url);
      }
      setPendingFiles(prev => [...prev, ...uploaded]);
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload your file.', variant: 'destructive' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || !conversation || sending) return;
    const text = input.trim();
    const files = [...pendingFiles];
    setInput('');
    setPendingFiles([]);
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: text || '(see attached)',
        ...(files.length > 0 && { file_urls: files }),
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' });
    }
    setSending(false);
  };

  const handleCopyPrompt = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Builder prompt copied to your clipboard.' });
  };

  const handleReset = () => {
    setConversation(null);
    setMessages([]);
    setInput('');
    setPendingFiles([]);
    lastReportCountRef.current = 0;
  };

  if (!conversation) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Report Assistant
          </CardTitle>
          <CardDescription>
            Chat with an AI assistant that interviews you, builds a polished bug/feature report, and generates a ready-to-paste prompt for the Base44 builder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startConversation} disabled={starting} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {starting ? 'Starting…' : <><Sparkles className="w-4 h-4 mr-2" />Start a Reporting Session</>}
          </Button>
          <ul className="text-xs text-slate-500 mt-4 space-y-1">
            <li>• Tell it about a bug or feature in plain English</li>
            <li>• It asks the right follow-ups (where, what, expected vs. actual)</li>
            <li>• You can attach screenshots</li>
            <li>• It generates a builder-prompt you can copy & paste</li>
            <li>• It saves the report to the Reports list automatically</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm flex flex-col h-[640px]">
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Report Assistant</CardTitle>
            <p className="text-xs text-slate-500">Tell me about a bug or a feature</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />New Session
        </Button>
      </CardHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8">
            Start by describing what's wrong or what you'd like to add…
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} onCopyPrompt={handleCopyPrompt} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-9">
            <RefreshCw className="w-3 h-3 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 p-3 space-y-2 flex-shrink-0">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingFiles.map((url, i) => (
              <div key={i} className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1 text-xs">
                <Paperclip className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[140px]">{url.split('/').pop()}</span>
                <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message... (Shift+Enter for newline)"
            className="min-h-[44px] max-h-[140px] resize-none flex-1"
            disabled={sending}
          />
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleAttach} accept="image/*,.pdf,.txt" />
            <span className={cn(
              "inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-slate-100 transition-colors",
              uploading && "opacity-50"
            )}>
              <Paperclip className="w-4 h-4 text-slate-600" />
            </span>
          </label>
          <Button onClick={handleSend} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="h-9">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}