import PageLayout from "@/components/layout/PageLayout";
import RewardCard from "@/components/rewards/reward-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reward } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";

export default function RewardsPage() {
  const { data: rewards, isLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
  });

  const totalPoints =
    rewards?.reduce((sum, reward) => sum + reward.points, 0) ?? 0;

  return (
    <PageLayout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="mt-1 text-muted-foreground">
          Points earned from rides and safety verifications.
        </p>

        <Card className="mt-6">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total points</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-20" />
              ) : (
                <p className="text-2xl font-semibold">{totalPoints}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : rewards && rewards.length > 0 ? (
              <div className="space-y-3">
                {rewards.map((reward) => (
                  <RewardCard key={reward.id} reward={reward} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No rewards yet. Complete a ride to start earning points.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
