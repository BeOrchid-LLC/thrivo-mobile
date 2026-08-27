import BodyStep from "./screens/BodyStep";
import GoalStep from "./screens/GoalStep";
import NotificationsStep from "./screens/NotificationsStep";
import StartFreeStep from "./screens/StartFreeStep";
import TargetStep from "./screens/TargetStep";
import WeightStep from "./screens/WeightStep";
import type { OnboardingStepProps } from "./types";

export const STEP_SCREENS: Record<number, (props: OnboardingStepProps) => React.ReactNode> = {
  1: (props) => <GoalStep {...props} />,
  2: (props) => <WeightStep {...props} />,
  3: (props) => <BodyStep {...props} />,
  4: (props) => <TargetStep {...props} />,
  5: (props) => <StartFreeStep {...props} />,
  6: (props) => <NotificationsStep {...props} />,
};
