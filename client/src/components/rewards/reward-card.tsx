import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import type { Reward } from "@shared/schema";
import { formatDate } from "@/lib/datetime";

interface RewardCardProps {
  reward: Reward;
}

export default function RewardCard({ reward }: RewardCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 rounded-full bg-primary/10 p-3">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="break-words font-medium">{reward.description}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date(reward.createdAt!))}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge variant="secondary" className="break-all">{reward.type}</Badge>
          <p className="whitespace-nowrap font-semibold">+{reward.points} points</p>
        </div>
      </CardContent>
    </Card>
  );
}