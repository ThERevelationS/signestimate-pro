/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import BrickStoneInventory from './pages/BrickStoneInventory';
import BrickStoneInventory2 from './pages/BrickStoneInventory2';
import BrickStoneProjects from './pages/BrickStoneProjects';
import BrickStoneProjects2 from './pages/BrickStoneProjects2';
import BrickStoneSettings from './pages/BrickStoneSettings';
import BrickStoneSettings2 from './pages/BrickStoneSettings2';
import CNCProjects from './pages/CNCProjects';
import CNCSettings from './pages/CNCSettings';
import ChannelLetterInstallationProjects from './pages/ChannelLetterInstallationProjects';
import ChannelLetterInstallationSettings from './pages/ChannelLetterInstallationSettings';
import Dashboard from './pages/Dashboard';
import FormulaViewer from './pages/FormulaViewer';
import FoundationInventory from './pages/FoundationInventory';
import FoundationProjects from './pages/FoundationProjects';
import FoundationSettings from './pages/FoundationSettings';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import LaserProjects from './pages/LaserProjects';
import LaserSettings from './pages/LaserSettings';
import MetalProjects from './pages/MetalProjects';
import MetalSettings from './pages/MetalSettings';
import MyProfile from './pages/MyProfile';
import NewBrickStoneEstimate from './pages/NewBrickStoneEstimate';
import NewBrickStoneEstimate2 from './pages/NewBrickStoneEstimate2';
import NewCNCEstimate from './pages/NewCNCEstimate';
import NewChannelLetterInstallation from './pages/NewChannelLetterInstallation';
import NewFoundationEstimate from './pages/NewFoundationEstimate';
import NewLaserEstimate from './pages/NewLaserEstimate';
import NewMetalEstimate from './pages/NewMetalEstimate';
import NewPaintEstimate from './pages/NewPaintEstimate';
import PaintProjects from './pages/PaintProjects';
import PaintSettings from './pages/PaintSettings';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BrickStoneInventory": BrickStoneInventory,
    "BrickStoneInventory2": BrickStoneInventory2,
    "BrickStoneProjects": BrickStoneProjects,
    "BrickStoneProjects2": BrickStoneProjects2,
    "BrickStoneSettings": BrickStoneSettings,
    "BrickStoneSettings2": BrickStoneSettings2,
    "CNCProjects": CNCProjects,
    "CNCSettings": CNCSettings,
    "ChannelLetterInstallationProjects": ChannelLetterInstallationProjects,
    "ChannelLetterInstallationSettings": ChannelLetterInstallationSettings,
    "Dashboard": Dashboard,
    "FormulaViewer": FormulaViewer,
    "FoundationInventory": FoundationInventory,
    "FoundationProjects": FoundationProjects,
    "FoundationSettings": FoundationSettings,
    "Home": Home,
    "Inventory": Inventory,
    "LaserProjects": LaserProjects,
    "LaserSettings": LaserSettings,
    "MetalProjects": MetalProjects,
    "MetalSettings": MetalSettings,
    "MyProfile": MyProfile,
    "NewBrickStoneEstimate": NewBrickStoneEstimate,
    "NewBrickStoneEstimate2": NewBrickStoneEstimate2,
    "NewCNCEstimate": NewCNCEstimate,
    "NewChannelLetterInstallation": NewChannelLetterInstallation,
    "NewFoundationEstimate": NewFoundationEstimate,
    "NewLaserEstimate": NewLaserEstimate,
    "NewMetalEstimate": NewMetalEstimate,
    "NewPaintEstimate": NewPaintEstimate,
    "PaintProjects": PaintProjects,
    "PaintSettings": PaintSettings,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};