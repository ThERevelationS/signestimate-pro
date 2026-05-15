import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bug, Lightbulb, MessageCircle, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS, lookup } from './reportConstants';

export default function ReportCard({ report, onOpen, onDelete, currentUser }) {
  const status = lookup(STATUS_OPTIONS, report.status) || STATUS_OPTIONS[0];
  const priority = lookup(PRIORITY_OPTIONS, report.priority) || PRIORITY_OPTIONS[1];
  const category = lookup(CATEGORY_OPTIONS, report.category);
  const isBug = report.type === 'bug';
  const canDelete = currentUser?.role === 'admin' || report.created_by === currentUser?.email;
  const commentCount = report.comments?.length || 0;

  return (
    <Card
      className="border border-slate-200 hover:border-slate-300 hover:shadow-md transition cursor-pointer"
      onClick={onOpen}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isBug ? 'bg-red-50' : 'bg-amber-50'}`}>
              {isBug
                ? <Bug className="w-5 h-5 text-red-500" />
                : <Lightbulb className="w-5 h-5 text-amber-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-900 truncate">{report.title}</div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{report.created_by}</span>
                <span>•</span>
                <span>{format(new Date(report.created_date), 'MMM d, yyyy')}</span>
                {report.page_location && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{report.page_location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete(report); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {report.description && (
          <p className="text-sm text-slate-600 line-clamp-2 pl-12">{report.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap pl-12">
          <Badge className={`${status.color} border text-[10px] uppercase`}>{status.label}</Badge>
          <Badge className={`${priority.color} border text-[10px] uppercase`}>{priority.label}</Badge>
          {category && <Badge variant="outline" className="text-[10px]">{category.label}</Badge>}
          {commentCount > 0 && (
            <span className="text-xs text-slate-500 inline-flex items-center gap-1 ml-auto">
              <MessageCircle className="w-3 h-3" />
              {commentCount}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}