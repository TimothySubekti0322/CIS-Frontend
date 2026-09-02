import type {
  ConfigParameter,
  ConfigSection,
  ConfigTier,
  ParameterCatalog,
  ParameterOwner,
  ParameterType,
} from "@/types/settings";
import type {
  ConfigCatalogDto,
  ConfigParamViewDto,
  ConfigSectionViewDto,
  ConfigTierDto,
} from "./dto.settings";
import { bool, list, num, oneOf, str, text } from "./primitives";

const TYPES: ParameterType[] = ["number", "integer", "string", "boolean"];
const OWNERS: ParameterOwner[] = ["backend", "ai", "shared"];

/**
 * `min`/`max` map to `null` rather than 0 when absent: the backend omits them
 * for an unbounded parameter, and a 0 floor would silently forbid the negative
 * z-score the velocity range needs.
 */
export function mapParameter(dto: ConfigParamViewDto): ConfigParameter {
  const fallback = text(dto.default);
  return {
    key: dto.key,
    label: text(dto.label, dto.key),
    tier: text(dto.tier),
    section: text(dto.section),
    type: oneOf(dto.type, TYPES, "number"),
    default: fallback,
    min: num(dto.min),
    max: num(dto.max),
    unit: str(dto.unit),
    owner: oneOf(dto.owner, OWNERS, "backend"),
    sumGroup: str(dto.sum_group),
    derived: bool(dto.derived),
    managedBy: str(dto.managed_by),
    prdRef: str(dto.prd_ref),
    paramId: str(dto.param_id),
    description: text(dto.description),
    note: str(dto.note),
    // An absent value falls back to the default rather than to "", so a form
    // never renders an empty input for a parameter that has a documented value.
    value: text(dto.value, fallback),
    isSet: bool(dto.is_set),
    // Writability defaults to false: rendering an editable control for a value
    // the server will refuse is the worse of the two failures.
    writable: bool(dto.writable),
  };
}

export function mapSection(dto: ConfigSectionViewDto): ConfigSection {
  return {
    key: dto.key,
    tier: text(dto.tier),
    title: text(dto.title, dto.key),
    description: text(dto.description),
    parameters: list(dto.parameters).map(mapParameter),
  };
}

export function mapTier(dto: ConfigTierDto): ConfigTier {
  return {
    key: dto.key,
    title: text(dto.title, dto.key),
    description: text(dto.description),
  };
}

export function mapParameterCatalog(dto: ConfigCatalogDto): ParameterCatalog {
  return {
    tiers: list(dto?.tiers).map(mapTier),
    sections: list(dto?.sections).map(mapSection),
    generatedAt: str(dto?.generated_at),
  };
}
