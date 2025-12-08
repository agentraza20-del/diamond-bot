const fs = require('fs');
const path = require('path');

const TOGGLES_FILE = path.join(__dirname, '..', 'config', 'feature-toggles.json');

class FeatureToggleManager {
  /**
   * Load toggles from config file
   */
  static loadToggles() {
    try {
      if (!fs.existsSync(TOGGLES_FILE)) {
        this.initializeToggles();
      }
      const data = fs.readFileSync(TOGGLES_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading toggles:', error);
      return this.getDefaultToggles();
    }
  }

  /**
   * Save toggles to config file
   */
  static saveToggles(toggles) {
    try {
      fs.writeFileSync(TOGGLES_FILE, JSON.stringify(toggles, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving toggles:', error);
      return false;
    }
  }

  /**
   * Get single feature status
   */
  static isFeatureEnabled(featureName) {
    const toggles = this.loadToggles();
    return toggles[featureName]?.enabled ?? false;
  }

  /**
   * Check if duplicate detection is enabled
   */
  static isDuplicateDetectionEnabled() {
    return this.isFeatureEnabled('duplicateDetection');
  }

  /**
   * Check if offline detection is enabled
   */
  static isOfflineDetectionEnabled() {
    return this.isFeatureEnabled('offlineDetection');
  }

  /**
   * Check if order tracking is enabled
   */
  static isOrderTrackingEnabled() {
    return this.isFeatureEnabled('orderTracking');
  }

  /**
   * Toggle feature on/off
   */
  static toggleFeature(featureName, enabled, modifiedBy = 'admin') {
    try {
      const toggles = this.loadToggles();
      
      if (!toggles[featureName]) {
        return {
          success: false,
          message: `Feature '${featureName}' not found`,
          available: Object.keys(toggles)
        };
      }

      toggles[featureName].enabled = enabled;
      toggles[featureName].lastModified = new Date().toISOString();
      toggles[featureName].modifiedBy = modifiedBy;

      this.saveToggles(toggles);

      return {
        success: true,
        message: `${toggles[featureName].name} ${enabled ? 'enabled' : 'disabled'}`,
        feature: toggles[featureName]
      };
    } catch (error) {
      return {
        success: false,
        message: `Error toggling feature: ${error.message}`
      };
    }
  }

  /**
   * Get all toggles status
   */
  static getAllToggles() {
    return this.loadToggles();
  }

  /**
   * Get feature details with status
   */
  static getFeatureDetails(featureName) {
    const toggles = this.loadToggles();
    return toggles[featureName] ?? null;
  }

  /**
   * Initialize default toggles
   */
  static initializeToggles() {
    const defaults = this.getDefaultToggles();
    this.saveToggles(defaults);
  }

  /**
   * Get default toggle values
   */
  static getDefaultToggles() {
    return {
      duplicateDetection: {
        enabled: true,
        name: 'Duplicate Order Detection',
        description: 'ডুপ্লিকেট অর্ডার ব্লক করবে (একই user, একই amount, 5 মিনিটের মধ্যে)',
        window: 5,
        lastModified: new Date().toISOString(),
        modifiedBy: 'system'
      },
      offlineDetection: {
        enabled: true,
        name: 'Offline Order Detection',
        description: 'অফলাইন অর্ডার detect করবে এবং track করবে',
        offlineThreshold: 2,
        lastModified: new Date().toISOString(),
        modifiedBy: 'system'
      },
      orderTracking: {
        enabled: true,
        name: 'Order Tracking',
        description: 'Admin panel এ order status tracking দেখাবে',
        lastModified: new Date().toISOString(),
        modifiedBy: 'system'
      }
    };
  }

  /**
   * Get feature configuration with current values
   */
  static getFeatureConfig(featureName) {
    const toggles = this.loadToggles();
    const feature = toggles[featureName];
    
    if (!feature) return null;

    return {
      name: feature.name,
      enabled: feature.enabled,
      description: feature.description,
      lastModified: feature.lastModified,
      modifiedBy: feature.modifiedBy,
      config: {
        window: feature.window,
        offlineThreshold: feature.offlineThreshold
      }
    };
  }

  /**
   * Get summary report of all features
   */
  static getStatusReport() {
    const toggles = this.loadToggles();
    const report = {
      timestamp: new Date().toISOString(),
      features: {}
    };

    Object.keys(toggles).forEach(key => {
      report.features[key] = {
        name: toggles[key].name,
        enabled: toggles[key].enabled,
        lastModified: toggles[key].lastModified,
        modifiedBy: toggles[key].modifiedBy
      };
    });

    return report;
  }
}

module.exports = FeatureToggleManager;
