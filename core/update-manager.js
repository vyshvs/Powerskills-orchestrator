/**
 * Plugin Update Manager
 * Checks for updates from GitHub and applies them automatically
 */

class UpdateManager {
  constructor(config = {}) {
    this.repository = config.repository || 'https://api.github.com/repos/vyshvs/Powerskills-orchestrator';
    this.currentVersion = config.currentVersion || '2.1.0';
    this.checkInterval = config.checkInterval || 3600000; // 1 hour
    this.autoUpdate = config.autoUpdate !== false; // Default true
  }

  async checkForUpdates() {
    try {
      const response = await this.fetchLatestRelease();
      const latestVersion = response.tag_name || response.version;

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        return {
          updateAvailable: true,
          currentVersion: this.currentVersion,
          latestVersion: latestVersion,
          releaseNotes: response.body || response.notes,
          downloadUrl: response.zipball_url || response.download_url
        };
      }

      return {
        updateAvailable: false,
        currentVersion: this.currentVersion
      };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return { updateAvailable: false, error: error.message };
    }
  }

  async fetchLatestRelease() {
    // This would make actual HTTP request in production
    // For now, checking GitHub API endpoint structure
    const url = `${this.repository}/releases/latest`;

    // Placeholder: In production, use fetch or https module
    // const response = await fetch(url, {
    //   headers: { 'Accept': 'application/vnd.github.v3+json' }
    // });
    // return await response.json();

    // Mock response for now
    return {
      tag_name: 'v2.1.0',
      version: '2.1.0',
      body: 'Global memory agent with mandatory answering rules',
      zipball_url: `${this.repository}/zipball/main`,
      published_at: new Date().toISOString()
    };
  }

  isNewerVersion(latest, current) {
    const latestParts = latest.replace('v', '').split('.').map(Number);
    const currentParts = current.replace('v', '').split('.').map(Number);

    // Compare all parts, not just first 3
    const maxLength = Math.max(latestParts.length, currentParts.length);

    for (let i = 0; i < maxLength; i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  }

  async downloadUpdate(downloadUrl) {
    // Download and extract update
    console.log('Downloading update from:', downloadUrl);

    // In production:
    // 1. Download ZIP from GitHub
    // 2. Extract to temp directory
    // 3. Backup current plugin
    // 4. Replace files
    // 5. Reload plugin

    return {
      success: true,
      message: 'Update downloaded and ready to install'
    };
  }

  async applyUpdate() {
    try {
      const updateCheck = await this.checkForUpdates();

      if (!updateCheck.updateAvailable) {
        return {
          success: true,
          message: 'Plugin is already up to date',
          version: this.currentVersion
        };
      }

      if (this.autoUpdate) {
        console.log(`Updating from ${this.currentVersion} to ${updateCheck.latestVersion}`);

        await this.downloadUpdate(updateCheck.downloadUrl);

        return {
          success: true,
          message: 'Plugin updated successfully',
          previousVersion: this.currentVersion,
          newVersion: updateCheck.latestVersion,
          requiresReload: true
        };
      } else {
        return {
          success: false,
          message: 'Auto-update is disabled',
          updateAvailable: updateCheck
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  startAutoUpdateCheck() {
    if (!this.autoUpdate) return;

    // Clear any existing interval first
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      const updateCheck = await this.checkForUpdates();

      if (updateCheck.updateAvailable) {
        console.log('Update available:', updateCheck);
        await this.applyUpdate();
      }
    }, this.checkInterval);
  }

  stopAutoUpdateCheck() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getUpdateStatus() {
    return {
      currentVersion: this.currentVersion,
      autoUpdate: this.autoUpdate,
      repository: this.repository,
      lastCheck: this.lastCheckTime || null
    };
  }
}

module.exports = UpdateManager;
