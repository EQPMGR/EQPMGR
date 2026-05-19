
'use client';

import type { StravaActivity } from "@/app/(app)/settings/apps/actions";
import type { Equipment } from "@/lib/types";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";
import { AssignActivityDialog } from "./assign-activity-dialog";

interface ActivityCardProps {
    activity: StravaActivity;
    bikes: Equipment[];
    onActivityAssigned: (activityId: number) => void;
}

export function ActivityCard({ activity, bikes, onActivityAssigned }: ActivityCardProps) {
    const isRide = activity.type === 'Ride' || activity.type === 'VirtualRide' || activity.type === 'EBikeRide';
    const alreadySynced = activity.alreadySynced ?? false;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{activity.name}</CardTitle>
                    {alreadySynced && (
                        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                            Already synced
                        </span>
                    )}
                </div>
                <CardDescription>
                    {new Date(activity.start_date).toLocaleDateString()} - {(activity.distance / 1000).toFixed(2)} km
                </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between">
                <Button variant="ghost" size="sm" asChild>
                    <a href={`https://strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer">
                        View <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                </Button>
                {isRide && !alreadySynced ? (
                    <AssignActivityDialog activity={activity} bikes={bikes} onAssigned={onActivityAssigned}>
                        <Button size="sm">Assign to Bike</Button>
                    </AssignActivityDialog>
                ) : isRide ? (
                    <Button size="sm" variant="secondary" disabled>
                        Already Synced
                    </Button>
                ) : null}
            </CardFooter>
        </Card>
    )
}
