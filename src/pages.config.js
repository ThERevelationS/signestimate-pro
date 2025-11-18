import Dashboard from './pages/Dashboard';
import NewPaintEstimate from './pages/NewPaintEstimate';
import PaintProjects from './pages/PaintProjects';
import NewLaserEstimate from './pages/NewLaserEstimate';
import LaserProjects from './pages/LaserProjects';
import PaintSettings from './pages/PaintSettings';
import LaserSettings from './pages/LaserSettings';
import NewCNCEstimate from './pages/NewCNCEstimate';
import CNCProjects from './pages/CNCProjects';
import CNCSettings from './pages/CNCSettings';
import NewMetalEstimate from './pages/NewMetalEstimate';
import MetalProjects from './pages/MetalProjects';
import MetalSettings from './pages/MetalSettings';
import MyProfile from './pages/MyProfile';
import FormulaViewer from './pages/FormulaViewer';
import UserManagement from './pages/UserManagement';
import Inventory from './pages/Inventory';
import NewChannelLetterInstallation from './pages/NewChannelLetterInstallation';
import ChannelLetterInstallationProjects from './pages/ChannelLetterInstallationProjects';
import ChannelLetterInstallationSettings from './pages/ChannelLetterInstallationSettings';
import NewFoundationEstimate from './pages/NewFoundationEstimate';
import FoundationProjects from './pages/FoundationProjects';
import FoundationSettings from './pages/FoundationSettings';
import NewBrickStoneEstimate from './pages/NewBrickStoneEstimate';
import BrickStoneProjects from './pages/BrickStoneProjects';
import BrickStoneInventory from './pages/BrickStoneInventory';
import BrickStoneSettings from './pages/BrickStoneSettings';
import NewBrickStoneEstimate2 from './pages/NewBrickStoneEstimate2';
import BrickStoneProjects2 from './pages/BrickStoneProjects2';
import BrickStoneInventory2 from './pages/BrickStoneInventory2';
import BrickStoneSettings2 from './pages/BrickStoneSettings2';
import FoundationInventory from './pages/FoundationInventory';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewPaintEstimate": NewPaintEstimate,
    "PaintProjects": PaintProjects,
    "NewLaserEstimate": NewLaserEstimate,
    "LaserProjects": LaserProjects,
    "PaintSettings": PaintSettings,
    "LaserSettings": LaserSettings,
    "NewCNCEstimate": NewCNCEstimate,
    "CNCProjects": CNCProjects,
    "CNCSettings": CNCSettings,
    "NewMetalEstimate": NewMetalEstimate,
    "MetalProjects": MetalProjects,
    "MetalSettings": MetalSettings,
    "MyProfile": MyProfile,
    "FormulaViewer": FormulaViewer,
    "UserManagement": UserManagement,
    "Inventory": Inventory,
    "NewChannelLetterInstallation": NewChannelLetterInstallation,
    "ChannelLetterInstallationProjects": ChannelLetterInstallationProjects,
    "ChannelLetterInstallationSettings": ChannelLetterInstallationSettings,
    "NewFoundationEstimate": NewFoundationEstimate,
    "FoundationProjects": FoundationProjects,
    "FoundationSettings": FoundationSettings,
    "NewBrickStoneEstimate": NewBrickStoneEstimate,
    "BrickStoneProjects": BrickStoneProjects,
    "BrickStoneInventory": BrickStoneInventory,
    "BrickStoneSettings": BrickStoneSettings,
    "NewBrickStoneEstimate2": NewBrickStoneEstimate2,
    "BrickStoneProjects2": BrickStoneProjects2,
    "BrickStoneInventory2": BrickStoneInventory2,
    "BrickStoneSettings2": BrickStoneSettings2,
    "FoundationInventory": FoundationInventory,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};