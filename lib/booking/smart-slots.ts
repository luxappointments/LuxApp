import { addMinutes, differenceInMinutes, isAfter, isBefore } from "date-fns";

import { SlotOption } from "@/types/domain";

interface BusyRange {
  startsAt: Date;
  endsAt: Date;
}

interface SlotInput {
  staffId: string;
  workStart: Date;
  workEnd: Date;
  serviceDurationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  granularityMin: number;
  busy: BusyRange[];
}

export function generateSmartSlots(input: SlotInput): SlotOption[] {
  const {
    staffId,
    workStart,
    workEnd,
    serviceDurationMin,
    bufferBeforeMin,
    bufferAfterMin,
    granularityMin,
    busy
  } = input;

  const totalNeeded = serviceDurationMin + bufferBeforeMin + bufferAfterMin;
  const slots: SlotOption[] = [];

  for (let cursor = workStart; isBefore(cursor, workEnd); cursor = addMinutes(cursor, granularityMin)) {
    const effectiveStart = addMinutes(cursor, -bufferBeforeMin);
    const effectiveEnd = addMinutes(cursor, serviceDurationMin + bufferAfterMin);

    if (differenceInMinutes(workEnd, cursor) < serviceDurationMin) continue;

    const conflict = busy.some((range) => isBefore(effectiveStart, range.endsAt) && isAfter(effectiveEnd, range.startsAt));

    if (conflict) continue;

    const nearestBefore = busy
      .filter((range) => isBefore(range.endsAt, effectiveStart))
      .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime())[0];

    const nearestAfter = busy
      .filter((range) => isAfter(range.startsAt, effectiveEnd))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

    const gapBefore = nearestBefore ? differenceInMinutes(effectiveStart, nearestBefore.endsAt) : 0;
    const gapAfter = nearestAfter ? differenceInMinutes(nearestAfter.startsAt, effectiveEnd) : 0;
    const score = gapBefore + gapAfter;

    slots.push({
      staffId,
      startsAt: cursor.toISOString(),
      endsAt: addMinutes(cursor, serviceDurationMin).toISOString(),
      score,
      recommended: false
    });
  }

  return slots
    .sort((a, b) => a.score - b.score)
    .map((slot, index) => ({
      ...slot,
      recommended: index < 8 && totalNeeded <= differenceInMinutes(workEnd, workStart)
    }));
}
