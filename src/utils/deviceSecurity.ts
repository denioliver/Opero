import * as LocalAuthentication from "expo-local-authentication";

export const requireDeviceSecurity = async (actionLabel?: string) => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    throw new Error(
      "Ative biometria ou senha do dispositivo para concluir esta ação.",
    );
  }

  const authResult = await LocalAuthentication.authenticateAsync({
    promptMessage: actionLabel
      ? `Confirme para ${actionLabel}`
      : "Confirme para continuar",
    fallbackLabel: "Usar senha do dispositivo",
    cancelLabel: "Cancelar",
    disableDeviceFallback: false,
  });

  if (!authResult.success) {
    throw new Error("Ação cancelada: autenticação do dispositivo não confirmada.");
  }
};
