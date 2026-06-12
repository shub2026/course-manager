/**
 * M4修复：统一的方案匹配逻辑
 * 提供findBestMatchPlan和isClassMatchPlan的共享实现
 */

/**
 * 判断班级是否匹配指定培养方案
 * @param {object} cls - 班级对象（包含major_id, training_level_id, custom_plan_id）
 * @param {object} plan - 培养方案对象（包含id, major_id, training_level_id）
 * @returns {boolean} 是否匹配
 */
export function isClassMatchPlan(cls, plan) {
  // 1. 自定义方案优先匹配
  if (cls.custom_plan_id && cls.custom_plan_id === plan.id) return true;
  
  // 2. 按专业匹配（仅当班级未指定自定义方案时）
  if (!cls.custom_plan_id && cls.major_id && cls.major_id === plan.major_id) return true;
  
  // 3. 按层次匹配（仅当班级未指定自定义方案时）
  if (!cls.custom_plan_id && cls.training_level_id && cls.training_level_id === plan.training_level_id) return true;
  
  return false;
}

/**
 * 为班级查找最佳匹配的培养方案
 * @param {object} cls - 班级对象
 * @param {Array} matchingPlans - 候选方案列表
 * @param {Map} classPlanMap - 自定义方案映射表（可选）
 * @returns {object|null} 最佳匹配的方案，无则返回null
 */
export function findBestMatchPlan(cls, matchingPlans, classPlanMap = null) {
  // 1. 自定义方案优先
  if (cls.custom_plan_id && classPlanMap) {
    const customPlan = classPlanMap.get(cls.id);
    if (customPlan) return customPlan;
  }

  // 2. 遍历所有方案，根据方案的关联类型来匹配
  for (const plan of matchingPlans) {
    // 方案按专业关联：检查班级的专业是否匹配
    if (plan.major_id && plan.major_id === cls.major_id) {
      return plan;
    }
    
    // 方案按层次关联：检查班级的层次是否匹配
    if (plan.training_level_id && plan.training_level_id === cls.training_level_id) {
      return plan;
    }
  }

  return null;
}
