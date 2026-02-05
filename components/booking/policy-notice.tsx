"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PolicyNotice({
  cancellationMinutes,
  lateToleranceMinutes,
  depositPercent,
  bookingLeadDays
}: {
  cancellationMinutes: number;
  lateToleranceMinutes: number;
  depositPercent: number;
  bookingLeadDays?: number;
}) {
  const { t, tx } = useLocale();
  const cancellationHours = Math.max(1, Math.round(cancellationMinutes / 60));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("booking.policiesTitle")}</CardTitle>
        <CardDescription>{tx("Confirmas que aceptas estos términos del negocio.", "You confirm that you accept this business policy.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-coolSilver">
        <p>{t("booking.cancellation")}: {cancellationHours} {tx("horas", "hours")}.</p>
        <p>{t("booking.lateTolerance")}: {lateToleranceMinutes} {tx("minutos", "minutes")}.</p>
        {bookingLeadDays && bookingLeadDays > 0 ? (
          <p>{tx("Antelacion minima", "Minimum advance")}: {bookingLeadDays} {tx("dias", "days")}.</p>
        ) : null}
        <p>{t("booking.requiredDeposit")}: {depositPercent}%.</p>
        <p>
          {tx(
            `Política de depósito: no es reembolsable si cancelas dentro de ${cancellationHours} horas antes de tu cita.`,
            `Deposit policy: it is non-refundable if you cancel within ${cancellationHours} hours before your appointment.`
          )}
        </p>
      </CardContent>
    </Card>
  );
}
