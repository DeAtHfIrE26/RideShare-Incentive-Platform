import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import type { Reward } from "@shared/schema";
import { format } from "date-fns";

interface RewardCardProps {
  reward: Reward;
}

export default function RewardCard({ reward }: RewardCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full p-3 bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{reward.description}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(reward.createdAt!), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{reward.type}</Badge>
          <p className="font-semibold">+{reward.points} points</p>
        </div>
      </CardContent>
    </Card>
  );
}