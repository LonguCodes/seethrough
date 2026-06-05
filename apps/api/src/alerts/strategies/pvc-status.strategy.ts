import { Injectable } from "@nestjs/common";

import type { TriggerStrategy } from "./trigger-strategy.interface.js";
import { AlertScope, TargetType } from "../alert.enums.js";
import type { PvcData } from "./scope-data.types.js";

@Injectable()
export class PvcStatusStrategy implements TriggerStrategy<PvcData, void> {
  readonly type = "pvc_status";
  readonly targetType = TargetType.PVC;
  readonly supportedScopes = [AlertScope.CLUSTER, AlertScope.NAMESPACE, AlertScope.PVC];
  readonly requiredParameters = [];
  readonly allParameters = [];

  evaluate(data: PvcData, parameters: void): boolean {
    if (!data.status) return false;
    // Alert if PVC is not Bound (e.g. Pending, Lost)
    return data.status.toLowerCase() !== "bound";
  }

  getMessage(data: PvcData, parameters: void): string {
    return `PVC ${data.name} in namespace ${data.namespace} is in ${data.status} state (expected Bound)`;
  }
}
