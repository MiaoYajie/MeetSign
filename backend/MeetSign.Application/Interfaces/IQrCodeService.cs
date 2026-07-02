namespace MeetSign.Application.Interfaces;

public interface IQrCodeService
{
    byte[] GeneratePng(string content, int pixelsPerModule = 10);
}
