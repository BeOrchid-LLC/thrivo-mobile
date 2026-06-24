import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { UpdateProfilePayload } from "@/contracts";
import { useSessionActions } from "@/stores";
import { updateProfile } from "../api/profile.api";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setProfileStatus } = useSessionActions();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me(), user);
      setProfileStatus({
        accountStatus: user.accountStatus,
        isOnboarded: user.isOnboarded,
        isOnboardingSkipped: user.isOnboardingSkipped,
      });
    },
  });
}
