"""Thin wrapper: passes all CLI args straight through to sherlock_project."""
import sys
from sherlock_project.sherlock import main
sys.exit(main())
