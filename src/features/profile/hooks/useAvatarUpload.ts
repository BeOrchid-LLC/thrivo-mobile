import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { queryKeys } from "@/api";
import { updateProfile } from "../api/profile.api";
import { uploadImage } from "../api/avatar.api";

/** Profile avatars are small — cap at 1 MB by default (overridable by the caller). */
export const AVATAR_MAX_BYTES = 1 * 1024 * 1024;

/**
 * Full avatar-change flow: pick + square-crop a photo, upload it directly to R2
 * via a presigned URL (size-capped at `maxBytes`), then attach the verified
 * public URL to the profile. Resolves to `null` when the user cancels.
 */
export function useAvatarUpload({ maxBytes = AVATAR_MAX_BYTES }: { maxBytes?: number } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // Graceful denial — surface a typed reason the caller can show.
        throw new Error("PERMISSION_DENIED");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return null;

      const asset = result.assets[0];
      const publicUrl = await uploadImage(
        { uri: asset.uri, mimeType: asset.mimeType, fileSize: asset.fileSize },
        { intent: "avatar", maxBytes }
      );
      return updateProfile({ image: publicUrl });
    },
    onSuccess: (user) => {
      if (user) queryClient.setQueryData(queryKeys.me(), user);
    },
  });
}
