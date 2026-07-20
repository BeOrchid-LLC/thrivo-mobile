import BodyStep from "./screens/BodyStep";
import GoalStep from "./screens/GoalStep";
import NameStep from "./screens/NameStep";
import NotificationsStep from "./screens/NotificationsStep";
import StartFreeStep from "./screens/StartFreeStep";
import TargetStep from "./screens/TargetStep";
import WeightStep from "./screens/WeightStep";
import type { OnboardingStepProps } from "./types";

export const STEP_SCREENS: Record<number, (props: OnboardingStepProps) => React.ReactNode> = {
  1: (props) => <NameStep {...props} />,
  2: (props) => <GoalStep {...props} />,
  3: (props) => <WeightStep {...props} />,
  4: (props) => <BodyStep {...props} />,
  5: (props) => <TargetStep {...props} />,
  6: (props) => <StartFreeStep {...props} />,
  7: (props) => <NotificationsStep {...props} />,
};
