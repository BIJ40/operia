import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReactNode, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  loading?: boolean;
}

export const ChartCard = memo(function ChartCard({ title, description, children, loading }: ChartCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
});
