import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LearnMoreSection {
  heading: string;
  content: string;
}

interface LearnMoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sections: LearnMoreSection[];
}

export function LearnMoreDialog({ open, onOpenChange, title, sections }: LearnMoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {sections.map((section, i) => (
            <div key={i}>
              <h4 className="font-semibold text-foreground mb-1">{section.heading}</h4>
              <p className="text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
