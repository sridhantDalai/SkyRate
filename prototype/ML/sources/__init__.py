from .easemytrip import EaseMyTripPlaywrightSource
from .makemytrip import MakeMyTripPlaywrightSource
from .indigo import IndiGoPlaywrightSource
from .airindia import AirIndiaPlaywrightSource
from .airindiaexpress import AirIndiaExpressPlaywrightSource
from .akasaair import AkasaAirPlaywrightSource
from .spicejet import SpiceJetPlaywrightSource
from .yatra import YatraPlaywrightSource
from .cleartrip import CleartripPlaywrightSource
from .ixigo import IxigoPlaywrightSource
from .goibibo import GoibiboPlaywrightSource

# Registry of available scrapers
SOURCE_REGISTRY = {
    "EaseMyTrip": EaseMyTripPlaywrightSource,
    # "MakeMyTrip": MakeMyTripPlaywrightSource,
    # "IndiGo": IndiGoPlaywrightSource,
    # "AirIndia": AirIndiaPlaywrightSource,
    # "AirIndiaExpress": AirIndiaExpressPlaywrightSource,
    # "AkasaAir": AkasaAirPlaywrightSource,
    # "SpiceJet": SpiceJetPlaywrightSource,
    # "Yatra": YatraPlaywrightSource,
    # "Cleartrip": CleartripPlaywrightSource,
    # "Ixigo": IxigoPlaywrightSource,
    # "Goibibo": GoibiboPlaywrightSource
}
