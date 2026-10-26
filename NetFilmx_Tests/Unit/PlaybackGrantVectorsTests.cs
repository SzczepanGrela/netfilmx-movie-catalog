using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using NetFilmx_Web.Playback;

namespace NetFilmx_Tests.Unit;
public class PlaybackGrantVectorsTests
{
    [Fact]
    public void DotNetIssuerProducesStrictCrossRuntimeVectors()
    {
        using var rsa=RSA.Create(2048);var p=rsa.ExportParameters(false);
        var now=DateTimeOffset.UtcNow.ToUnixTimeSeconds();var version=new string('a',64);
        var valid=new Dictionary<string,object>{["iss"]="test-issuer",["aud"]="test-media",["film"]="sintel",["ver"]=version,["iat"]=now,["nbf"]=now,["exp"]=now+1800,["jti"]=new string('b',32)};
        var vectors=new List<object>();
        void Add(string name, bool accepted, string film="sintel", Action<Dictionary<string,object>>? change=null,string kid="test-key")
        {
            var claims=new Dictionary<string,object>(valid);change?.Invoke(claims);
            vectors.Add(new{name,accepted,film,token=PlaybackGrantIssuer.Sign(rsa,kid,claims)});
        }
        Add("valid",true);Add("wrong-film",false,"charge");Add("unknown-key",false,kid:"unknown");
        Add("expired",false,change:c=>{c["iat"]=now-1801;c["nbf"]=now-1801;c["exp"]=now-1;});
        Add("future",false,change:c=>{c["iat"]=now+31;c["nbf"]=now+31;c["exp"]=now+1831;});
        Add("too-long",false,change:c=>c["exp"]=now+1801);
        Add("string-expiry",false,change:c=>c["exp"]=(now+1800).ToString());
        Add("wrong-version",false,change:c=>c["ver"]=new string('c',64));
        Add("wrong-audience",false,change:c=>c["aud"]="admin");Add("wrong-issuer",false,change:c=>c["iss"]="admin");
        Add("extra-claim",false,change:c=>c["prefix"]="arbitrary");
        var normal=PlaybackGrantIssuer.Sign(rsa,"test-key",valid);
        var parts=normal.Split('.');
        Assert.True(rsa.VerifyData(System.Text.Encoding.ASCII.GetBytes(parts[0]+"."+parts[1]),Base64UrlEncoder.DecodeBytes(parts[2]),HashAlgorithmName.SHA256,RSASignaturePadding.Pkcs1));
        vectors.Add(new{name="altered",accepted=false,film="sintel",token=parts[0]+"."+parts[1]+"."+(parts[2][0]=='A'?"B":"A")+parts[2][1..]});
        vectors.Add(new{name="wrong-alg",accepted=false,film="sintel",token=Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(new{alg="HS256",typ="nfx-playback+jwt",kid="test-key"}))+"."+parts[1]+"."+parts[2]});
        var jwk=new{kty="RSA",alg="RS256",use="sig",kid="test-key",n=Base64UrlEncoder.Encode(p.Modulus),e=Base64UrlEncoder.Encode(p.Exponent)};
        var output=Environment.GetEnvironmentVariable("NETFILMX_GRANT_VECTORS");
        if(!string.IsNullOrEmpty(output))
        {
            var path=Path.GetFullPath(output);Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path,JsonSerializer.Serialize(new{now,version,jwks=new{keys=new[]{jwk}},vectors},new JsonSerializerOptions{WriteIndented=true}));
        }
    }
}
