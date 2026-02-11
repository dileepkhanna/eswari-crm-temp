interface AvailabilityDisplayProps {
  availability?: string;
}

export default function AvailabilityDisplay({ availability }: AvailabilityDisplayProps) {
  if (!availability || !availability.trim()) {
    return (
      <div className="text-sm text-muted-foreground">
        No availability information available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
        {availability}
      </div>
    </div>
  );
}
