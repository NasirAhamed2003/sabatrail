import { usePlans } from "../lib/plans";
import type { Place } from "../lib/types";
import { Button, ButtonLink, type ButtonSize } from "./ui/Button";
import Icon from "./ui/Icon";

// "Add to my day": works signed out too (logs in, then finishes the add)
export default function AddToDayButton({
  place,
  size = "md",
  block = false,
}: {
  place: Place;
  size?: ButtonSize;
  block?: boolean;
}) {
  const { requestAdd, isInActivePlan, activePlan } = usePlans();

  if (activePlan && isInActivePlan(place.place_id)) {
    return (
      <ButtonLink
        to={`/plan/${activePlan.plan_id}`}
        variant="secondary"
        size={size}
        block={block}
        className="btn-added"
      >
        <Icon name="check" size={16} /> In your day
        <span className="visually-hidden">: {place.place_name} is in {activePlan.plan_name}. View plan</span>
      </ButtonLink>
    );
  }

  return (
    <Button size={size} block={block} onClick={() => requestAdd(place)}>
      <Icon name="plus" size={16} /> Add to my day
      <span className="visually-hidden">: {place.place_name}</span>
    </Button>
  );
}
