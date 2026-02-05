import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link to="/transactions?action=add">
          <Button className="w-full justify-start">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </Link>
        <Link to="/prices">
          <Button className="w-full justify-start" variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Update Prices
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}