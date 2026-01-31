"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertCircle, CheckCircle2 } from "lucide-react";
import { getProductAvailability } from "@/actions/availability";

interface AvailabilityData {
  date: Date;
  availableQuantity: number;
}

interface ProductAvailabilityCalendarProps {
  productId: string;
  totalQuantity: number;
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
}

export default function ProductAvailabilityCalendar({
  productId,
  totalQuantity,
  onDateSelect,
  selectedDate,
}: ProductAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        const data = await getProductAvailability(
          productId,
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
        );
        // Convert ISO strings back to Date objects
        setAvailability(
          data.map((item) => ({
            date: new Date(item.date),
            availableQuantity: item.availableQuantity,
          })),
        );
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [productId, currentMonth]);

  // Get availability for a specific date
  const getAvailabilityForDate = (date: Date): AvailabilityData | undefined => {
    return availability.find(
      (a) =>
        a.date.getDate() === date.getDate() &&
        a.date.getMonth() === date.getMonth() &&
        a.date.getFullYear() === date.getFullYear(),
    );
  };

  // Determine the status color for a date
  const getDateStatus = (
    date: Date,
  ): "available" | "partial" | "unavailable" | "past" => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return "past";
    }

    const dayAvailability = getAvailabilityForDate(date);
    if (!dayAvailability) return "available";

    if (dayAvailability.availableQuantity === 0) {
      return "unavailable";
    } else if (dayAvailability.availableQuantity < totalQuantity) {
      return "partial";
    }
    return "available";
  };

  // Custom day styling
  const modifiers = {
    available: (date: Date) => getDateStatus(date) === "available",
    partial: (date: Date) => getDateStatus(date) === "partial",
    unavailable: (date: Date) => getDateStatus(date) === "unavailable",
  };

  const modifiersStyles = {
    available: {
      backgroundColor: "rgba(34, 197, 94, 0.15)",
      color: "rgb(22, 163, 74)",
      fontWeight: "600",
    },
    partial: {
      backgroundColor: "rgba(234, 179, 8, 0.15)",
      color: "rgb(202, 138, 4)",
      fontWeight: "600",
    },
    unavailable: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      color: "rgb(220, 38, 38)",
      textDecoration: "line-through",
    },
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const status = getDateStatus(date);
      if (status !== "past" && status !== "unavailable") {
        onDateSelect?.(date);
      }
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get selected date availability info
  const selectedDateAvailability = selectedDate
    ? getAvailabilityForDate(selectedDate)
    : null;
  const selectedDateQty =
    selectedDateAvailability?.availableQuantity ?? totalQuantity;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Availability Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.3)" }}
            />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(234, 179, 8, 0.3)" }}
            />
            <span className="text-muted-foreground">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.3)" }}
            />
            <span className="text-muted-foreground">Unavailable</span>
          </div>
        </div>

        {/* Calendar */}
        {isLoading ? (
          <div className="flex items-center justify-center h-70">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              month={currentMonth}
              onMonthChange={handleMonthChange}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              disabled={(date) =>
                date < today || getDateStatus(date) === "unavailable"
              }
              className="rounded-md border"
            />
          </div>
        )}

        {/* Selected Date Info */}
        {selectedDate && (
          <div
            className={`p-3 rounded-lg border ${
              selectedDateQty === 0
                ? "bg-red-50 border-red-200"
                : selectedDateQty < totalQuantity
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-start gap-2">
              {selectedDateQty === 0 ? (
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
              )}
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Selected:{" "}
                  {selectedDate.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedDateQty === 0
                        ? "destructive"
                        : selectedDateQty < totalQuantity
                          ? "secondary"
                          : "default"
                    }
                  >
                    {selectedDateQty} / {totalQuantity} Available
                  </Badge>
                  {selectedDateQty === 0 && (
                    <span className="text-xs text-red-600">Fully Booked</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
